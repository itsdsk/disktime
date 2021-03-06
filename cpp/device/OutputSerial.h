#pragma once

#include <device/Output.h>
#include <serial/serial.h>
#include <thirdparty/json/single_include/nlohmann/json.hpp>
using json = nlohmann::json;

class OutputSerial : public Output
{
  public:
    OutputSerial(const json &properties)
        : _rs232Port()
    {
        // check properties object contains serial port and baud rate values, and set defaults if not
        if (properties.contains("port"))
        {
            _deviceName = properties["port"];
        }
        else
        {
            _deviceName = "/dev/ttyACM0";
            std::cout << "no serial port specified in properties, using default: " << _deviceName << std::endl;
        }
        if (properties.contains("rate"))
        {
            _baudRate = properties["rate"].get<int>();
        }
        else
        {
            _baudRate = 460800;
            std::cout << "no serial baud rate specified in properties, using default: " << _baudRate << std::endl;
        }
        open();
    };
    int open()
    {
        try
        {
            std::cout << "Opening UART: " << _deviceName << " at " << _baudRate << " Bd" << std::endl;
            _rs232Port.setPort(_deviceName);
            _rs232Port.setBaudrate(_baudRate);
            _rs232Port.open();
        }
        catch (const std::exception &e)
        {
            std::cerr << "Unable to open RS232 device (" << e.what() << ")" << std::endl;
            return -1;
        }

        return 0;
    }
    int writeBytes(const unsigned size, const uint8_t *data)
    {
        if (!_rs232Port.isOpen())
        {
            // (dont try to reopen)
            //int status = open();
            //if (status == -1)
            //{
            //    std::cout << "Device blocked" << std::endl;
            //}
            return -1;
        }

        try
        {
            _rs232Port.flushOutput();
            _rs232Port.write(data, size);
            _rs232Port.flush();
        }
        catch (const serial::SerialException &serialExc)
        {
            // TODO[TvdZ]: Maybe we should limit the frequency of this error report somehow
            std::cerr << "Serial exception caught while writing to device: " << serialExc.what() << std::endl;
            std::cout << "Attempting to re-open the device." << std::endl;

            // First make sure the device is properly closed
            try
            {
                _rs232Port.close();
            }
            catch (const std::exception &e)
            {
            }

            // Attempt to open the device and write the data
            try
            {
                _rs232Port.open();
                _rs232Port.write(data, size);
                _rs232Port.flush();
            }
            catch (const std::exception &e)
            {
                // We failed again, this not good, do nothing maybe in the next loop we have more success
            }
        }
        catch (const std::exception &e)
        {
            std::cerr << "Unable to write to RS232 device (" << e.what() << ")" << std::endl;
            return -1;
        }

        return 0;
    };
    virtual ~OutputSerial()
    {
        //
        if (_rs232Port.isOpen())
        {
            _rs232Port.close();
        }
    };
    std::string _deviceName = "/dev/ttyACM0";
    int _baudRate = 460800;
    serial::Serial _rs232Port;
    std::vector<uint8_t> _ledBuffer;
};